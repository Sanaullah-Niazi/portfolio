# Temporary: checks candidate sources from a GitHub runner (robots.txt, status, how many entries). Removed before merge.
import re, sys, urllib.request, urllib.robotparser, urllib.parse
UA = "Mozilla/5.0 (compatible; sanaullahniazi.com scholarships bot; +https://sanaullahniazi.com/scholarships/)"
K = "cyber+security"
C = [
 "https://jobs.newscientist.com/jobsrss/?keywords=" + K,
 "https://jobs.chronicle.com/jobsrss/?keywords=cybersecurity",
 "https://careers.insidehighered.com/jobsrss/?keywords=cybersecurity",
 "https://www.nature.com/naturecareers/jobsrss/?keywords=" + K,
 "https://jobs.sciencecareers.org/jobsrss/?keywords=" + K,
 "https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=phd+cryptography",
 "https://kth.varbi.com/en/what:rssfeed/",
 "https://liu.varbi.com/en/what:rssfeed/",
 "https://lu.varbi.com/en/what:rssfeed/",
 "https://uu.varbi.com/en/what:rssfeed/",
 "https://umu.varbi.com/en/what:rssfeed/",
 "https://su.varbi.com/en/what:rssfeed/",
 "https://gu.varbi.com/en/what:rssfeed/",
 "https://kau.varbi.com/en/what:rssfeed/",
 "https://jobs.inria.fr/public/classic/en/offres/rss",
 "https://emploi.cnrs.fr/Rss/Offres.aspx",
 "https://www.dtu.dk/english/about/job-and-career/vacant-positions/rss",
 "https://jobs.tue.nl/en/vacancies.rss",
 "https://www.utwente.nl/en/organisation/careers/rss",
 "https://www.universiteitleiden.nl/en/vacancies/rss",
 "https://www.aalto.fi/en/open-positions/rss",
 "https://jobs.ethz.ch/?format=rss",
 "https://www.jobs.ac.uk/jobs/rss?keywords=" + K,
 "https://www.jobs.ac.uk/feeds/search?keywords=" + K,
 "https://academicjobsonline.org/ajo/jobs.rss",
 "https://academicjobsonline.org/ajo/rss.xml",
 "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=60",
 "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=37",
 "https://www.ercim.eu/career/jobs/rss",
 "https://jobs.fraunhofer.de/rss",
 "https://www.mpg.de/feeds/jobs.rss",
 "https://jobrxiv.org/?feed=job_feed&search_keywords=cryptography",
 "https://jobrxiv.org/?feed=job_feed&search_keywords=cybersecurity",
 "https://scholarshiproar.com/?s=cybersecurity&feed=rss2",
 "https://www.mladiinfo.eu/?s=cybersecurity&feed=rss2",
 "https://www.opportunitiesforafricans.com/?s=cyber+security&feed=rss2",
 "https://www.scholarshipsads.com/feed/?s=cyber+security",
 "https://www.studyabroadaide.com/?s=cyber+security&feed=rss2",
 "https://www.fundsforngos.org/?s=cyber+security&feed=rss2",
 "https://jobs.tum.de/en/rss",
 "https://www.jobbnorge.no/en/available-jobs/rss",
 "https://www.uio.no/english/about/vacancies/rss",
 "https://www.ntnu.edu/vacancies/rss",
 "https://www.unimelb.edu.au/rss/jobs",
 "https://www.kaust.edu.sa/en/rss/jobs",
 "https://www.ucl.ac.uk/rss/jobs",
 "https://www.jobs.cam.ac.uk/job/rss",
 "https://www.jobs.cam.ac.uk/job/?format=rss",
 "https://my.corehr.com/pls/uoxrecruit/erq_jobspec_rss",
]
for url in C:
    host = "{0.scheme}://{0.netloc}".format(urllib.parse.urlsplit(url))
    rp = urllib.robotparser.RobotFileParser()
    try:
        r = urllib.request.urlopen(urllib.request.Request(host + "/robots.txt", headers={"User-Agent": UA}), timeout=20)
        rp.parse(r.read().decode("utf-8", "replace").splitlines()); rob = "allow" if rp.can_fetch(UA, url) else "DISALLOW"
    except Exception as e:
        rob = "robots:" + type(e).__name__ + str(getattr(e, "code", ""))
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/html;q=0.8, */*;q=0.5"}), timeout=25)
        body = r.read(3_000_000).decode("utf-8", "replace")
        n = len(re.findall(r"<item[\s>]|<entry[\s>]", body))
        titles = [re.sub(r"<!\[CDATA\[|\]\]>|<[^>]+>", "", t).strip()[:70] for t in re.findall(r"<title[^>]*>(.*?)</title>", body, re.S)[1:4]]
        print(f"{rob:10} {r.status} {r.headers.get('content-type','')[:24]:24} items={n:3} {url}\n      {titles}")
    except Exception as e:
        print(f"{rob:10} ERR {type(e).__name__} {getattr(e,'code','')} {url}")
    sys.stdout.flush()
